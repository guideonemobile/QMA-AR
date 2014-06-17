
#import "QMAAboutVC.h"


@interface QMAAboutVC ()

@property (nonatomic, weak) IBOutlet UIWebView *webView;

@end


@implementation QMAAboutVC

- (void)viewDidLoad {
    [super viewDidLoad];
    [self loadHTMLContent];
}

- (void)loadHTMLContent {
    NSURL *baseURL = [[[NSBundle mainBundle] resourceURL] URLByAppendingPathComponent:@"html" isDirectory:YES];
    NSURL *htmlURL = [baseURL URLByAppendingPathComponent:self.poi.aboutHTMLFile isDirectory:NO];
    NSError *error = nil;
    NSString *htmlString = [NSString stringWithContentsOfURL:htmlURL encoding:NSUTF8StringEncoding error:&error];
    if (error) {
        QMALog(@"Error: %@", [error localizedDescription]);
    }
    [self.webView loadHTMLString:htmlString baseURL:baseURL];
}

#pragma mark - Target Action

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{}];
}

@end
