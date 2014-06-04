
#import "QMAFactsVC.h"


@interface QMAFactsVC ()

@property (nonatomic, weak) IBOutlet UIWebView *webView;

@end


@implementation QMAFactsVC

- (void)viewDidLoad {
    [super viewDidLoad];
    //[self.webView loadHTMLString:self.poi.facts baseURL:nil];
}

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{}];
}

@end
