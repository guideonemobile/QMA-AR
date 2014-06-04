
#import "QMAGalleryVC.h"
#import "QMAGalleryItem.h"


@interface QMAGalleryVC () <UIScrollViewDelegate>

@property (nonatomic, weak) IBOutlet UIView *frameView;
@property (nonatomic, weak) IBOutlet UIScrollView *scrollView;
@property (nonatomic, weak) IBOutlet UIButton *closeButton;
@property (nonatomic, weak) IBOutlet UIButton *prevButton;
@property (nonatomic, weak) IBOutlet UIButton *nextButton;
@property (nonatomic, weak) IBOutlet UILabel *captionLabel;

@property (nonatomic, strong) NSArray *galleryItems;
@property (nonatomic) NSUInteger currentPage;
@property (nonatomic) BOOL navigationEnabled;

@end


@implementation QMAGalleryVC {
    
    BOOL _galleryHasBeenLoaded;
    
}

- (NSUInteger)currentPage {
    return (NSUInteger) (self.scrollView.contentOffset.x/self.scrollView.bounds.size.width);
}

- (void)setNavigationEnabled:(BOOL)navigationEnabled {
    _navigationEnabled = navigationEnabled;
    self.scrollView.scrollEnabled = navigationEnabled;
}

#pragma mark - View Controller Lifecycle

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    self.frameView.hidden = YES;
    self.scrollView.delegate = self;
    
    self.currentPage = 0;
    self.navigationEnabled = YES;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAGalleryItem"];
    request.predicate = [NSPredicate predicateWithFormat:@"poi = %@", self.poi];
    self.galleryItems = [self.poi.managedObjectContext executeFetchRequest:request error:nil];;
}

- (void)viewWillAppear:(BOOL)animated {
    
    [super viewWillAppear:animated];
    
    if (!_galleryHasBeenLoaded) {
        
        _galleryHasBeenLoaded = YES;
        
        self.scrollView.contentSize = CGSizeMake(self.scrollView.frame.size.width * [self.galleryItems count],
                                                 self.scrollView.frame.size.height);
        
        for (uint i = 0; i < [self.galleryItems count]; i++) {
            QMAGalleryItem *item = self.galleryItems[i];
            UIImageView *imgView = [[UIImageView alloc] initWithImage:[UIImage imageNamed:item.image]];
            CGRect frame = self.scrollView.bounds;
            frame.origin.x = frame.size.width * i;
            imgView.frame = frame;
            [self.scrollView addSubview:imgView];
        }
    }
    
    [self updateUI];
}

#pragma mark - Target Action

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{}];
}

- (IBAction)didTapToChangeGalleryItem:(UIButton *)sender {
    if (self.navigationEnabled) {
        self.navigationEnabled = NO;
        if (sender == self.prevButton) {
            [self.scrollView setContentOffset:CGPointMake(self.scrollView.frame.size.width*(self.currentPage-1), 0)
                                     animated:YES];
        } else if (sender == self.nextButton) {
            [self.scrollView setContentOffset:CGPointMake(self.scrollView.frame.size.width*(self.currentPage+1), 0)
                                     animated:YES];
        }
        [self performSelector:@selector(updateUI) withObject:nil afterDelay:0.5];
    }
}

#pragma mark - UIScrollViewDelegate

- (void)scrollViewDidEndDragging:(UIScrollView *)scrollView willDecelerate:(BOOL)decelerate {
    self.navigationEnabled = NO;
    [self performSelector:@selector(updateUI) withObject:nil afterDelay:0.5];
}

#pragma mark - Update UI

- (void)updateUI {
    
    QMAGalleryItem *item = self.galleryItems[self.currentPage];
    self.captionLabel.text = item.caption;
    
    self.prevButton.enabled = YES;
    self.nextButton.enabled = YES;
    if (self.currentPage == 0) {
        self.prevButton.enabled = NO;
    }
    if (self.currentPage == [self.galleryItems count] - 1) {
        self.nextButton.enabled = NO;
    }
    
    self.navigationEnabled = YES;
}

@end
